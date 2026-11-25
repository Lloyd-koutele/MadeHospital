package made.hospital.servicehospitalier.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import made.hospital.medecin.infra.MedecinRepository;
import made.hospital.notification.application.Notifier;
import made.hospital.servicehospitalier.infra.ServiceHospitalierRepository;

class ServiceHospitalierServiceTest
{

    private ServiceHospitalierRepository serviceRepository;
    private ServiceHospitalierService service;

    @BeforeEach
    void preparer()
    {
        serviceRepository = mock(ServiceHospitalierRepository.class);
        when(serviceRepository.existsByCodeIgnoreCase(anyString())).thenReturn(false);
        service = new ServiceHospitalierService(serviceRepository, mock(MedecinRepository.class), mock(Notifier.class));
    }

    @Test
    void unSeulMotDonneSesTroisPremieresLettres()
    {
        assertThat(service.genererCode("Imagerie")).isEqualTo("IMA");
        assertThat(service.genererCode("Odontologie")).isEqualTo("ODO");
    }

    @Test
    void plusieursMotsDonnentLesInitialesSansAccentsNiMotsDeLiaison()
    {
        assertThat(service.genererCode("Médecine interne")).isEqualTo("MI");
        assertThat(service.genererCode("Urgences et réanimation")).isEqualTo("UR");
        assertThat(service.genererCode("Service de chirurgie générale")).isEqualTo("SCG");
    }

    @Test
    void unCodeDejaPrisRecoitUnNumero()
    {
        when(serviceRepository.existsByCodeIgnoreCase("IMA")).thenReturn(true);
        when(serviceRepository.existsByCodeIgnoreCase("IMA2")).thenReturn(true);
        assertThat(service.genererCode("Imagerie")).isEqualTo("IMA3");
    }
}
